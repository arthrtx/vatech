<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecusarPedidoRequest;
use App\Http\Requests\StorePedidoRequest;
use App\Models\Pedido;
use App\Models\User;
use App\Services\LimitesPedidoService;
use App\Services\RegistoAtividade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PedidoController extends Controller
{
    private const TIPOS = ['ferias' => 'férias', 'ausencia' => 'ausência', 'licenca' => 'licença'];

    public function __construct(private LimitesPedidoService $limites) {}

    private function periodo(Pedido $p): string
    {
        $i = $p->data_inicio->format('d/m');
        $f = $p->data_fim->format('d/m');

        return $i === $f ? $i : "{$i} a {$f}";
    }

    /** Só tipo e datas: nunca subtipo, observação nem motivos. */
    private function descreverPedido(User $autor, Pedido $p, ?User $paraOutro): string
    {
        $quem = $paraOutro ? " para {$paraOutro->nome}" : '';

        return "{$autor->nome} pediu ".self::TIPOS[$p->tipo]."{$quem}: {$this->periodo($p)}";
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Pedido::where('empresa_id', $user->empresa_id)->whereHas('user')->with('anexos', 'autor:id,nome')->latest('id');

        if ($user->temPermissao('aprovar_pedidos')) {
            $query->with('user:id,nome');
        } elseif ($user->temPermissao('pedir_por_outros')) {
            // Vê também o que criou em nome de outros, para o poder editar ou cancelar.
            $query->with('user:id,nome')->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('criado_por', $user->id));
        } else {
            $query->where('user_id', $user->id);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->query('estado'));
        }
        if ($request->boolean('licencas_por_ver')) {
            $query->where('tipo', 'licenca')->whereNull('visto_em');
        }

        $pedidos = $query->get();
        $this->limites->anexarExcedentes($pedidos);

        return response()->json(['data' => $pedidos]);
    }

    public function store(StorePedidoRequest $request): JsonResponse
    {
        $autor = $request->user();
        $dados = Arr::except($request->validated(), 'user_id');
        $porOutro = $request->filled('user_id') && (int) $request->input('user_id') !== $autor->id;
        // Outra pessoa: só activa e da mesma empresa; 404 não revela quem existe noutras empresas.
        $user = $porOutro
            ? User::where('empresa_id', $autor->empresa_id)->where('estado_conta', 'aprovado')->findOrFail((int) $request->input('user_id'))
            : $autor;
        $this->garantirLimite($user, $dados);

        $sobrepoe = Pedido::where('user_id', $user->id)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->where('data_inicio', '<=', $dados['data_fim'])
            ->where('data_fim', '>=', $dados['data_inicio'])
            ->exists();

        // A licença é um direito do trabalhador: não fica à espera de aprovação, o admin só é avisado.
        $licenca = $dados['tipo'] === 'licenca' ? ['estado' => 'aprovado', 'decidido_em' => now()] : [];
        // O admin não pede a ninguém: o que marca para si fica aprovado e sem aviso.
        if ($user->isAdmin()) {
            $licenca = ['estado' => 'aprovado', 'decidido_por' => $user->id, 'decidido_em' => now(), 'visto_em' => now()];
        }
        // Em nome de outra pessoa nunca se aprova sozinho: fica pendente para alguém decidir (D14).
        if ($porOutro) {
            $licenca = [];
        }
        $pedido = Pedido::create([...$dados, ...$licenca, 'user_id' => $user->id, 'empresa_id' => $user->empresa_id, 'criado_por' => $autor->id]);

        RegistoAtividade::registar('pedido', $this->descreverPedido($autor, $pedido, $porOutro ? $user : null), $autor, $porOutro ? $user : null);

        $resposta = ['data' => $pedido->refresh()->load('anexos', 'autor:id,nome')];
        if ($sobrepoe) {
            $resposta['avisos'] = ['As datas sobrepõem-se a outro pedido seu.'];
        }

        return response()->json($resposta, 201);
    }

    /** Pessoas activas da empresa em nome de quem se pode pedir (D14). */
    public function pessoas(Request $request): JsonResponse
    {
        $user = $request->user();
        $pessoas = User::where('empresa_id', $user->empresa_id)
            ->where('estado_conta', 'aprovado')
            ->whereKeyNot($user->id)
            ->with('tipo:id,nome')
            ->orderBy('nome')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'nome' => $u->nome,
                'avatar_url' => $u->avatar_path ? Storage::disk('public')->url($u->avatar_path) : null,
                'papel' => $u->papel,
                'tipo_nome' => $u->tipo?->nome,
            ]);

        return response()->json(['data' => $pessoas]);
    }

    /** O funcionario edita um pedido seu enquanto esta pendente. */
    public function update(StorePedidoRequest $request, int $id): JsonResponse
    {
        $pedido = $this->pedidoPendenteDoUtilizador($request, $id);
        $dados = Arr::except($request->validated(), 'user_id');
        $this->garantirLimite($pedido->user ?? abort(404), $dados, $pedido->id);

        $sobrepoe = Pedido::where('user_id', $pedido->user_id)
            ->where('id', '!=', $pedido->id)
            ->whereIn('estado', ['pendente', 'aprovado'])
            ->where('data_inicio', '<=', $dados['data_fim'])
            ->where('data_fim', '>=', $dados['data_inicio'])
            ->exists();

        // Campos opcionais em falta limpam-se (ex.: mudar de ausencia para ferias remove o subtipo).
        $pedido->update([...$dados, 'subtipo' => $dados['subtipo'] ?? null, 'hora_inicio' => $dados['hora_inicio'] ?? null, 'hora_fim' => $dados['hora_fim'] ?? null, 'observacao' => $dados['observacao'] ?? null, 'urgente' => $dados['urgente'] ?? false, 'cor' => $dados['cor'] ?? null]);

        $resposta = ['data' => $pedido->refresh()->load('anexos', 'autor:id,nome')];
        if ($sobrepoe) {
            $resposta['avisos'] = ['As datas sobrepõem-se a outro pedido seu.'];
        }

        return response()->json($resposta);
    }

    private function garantirLimite($user, array $dados, ?int $excluirId = null): void
    {
        $erro = $this->limites->excedido($user, $dados['tipo'], $dados['data_inicio'], $dados['data_fim'], $excluirId);
        if ($erro !== null) {
            throw ValidationException::withMessages(['data_fim' => $erro]);
        }
    }

    /** O funcionario apaga um pedido seu enquanto esta pendente, ou cancela uma licença que ainda não começou. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        // Com «apagar_pedidos» apaga-se qualquer pedido da empresa, em qualquer estado.
        $pedido = $user->temPermissao('apagar_pedidos')
            ? Pedido::where('empresa_id', $user->empresa_id)->findOrFail($id)
            : $this->pedidoPendenteDoUtilizador($request, $id, licencaPorComecar: true);
        $dono = $pedido->user_id === $user->id ? null : User::find($pedido->user_id);
        // Os anexos (e os seus bytes) saem em cascata.
        $pedido->delete();
        RegistoAtividade::registar('pedido', "{$user->nome} apagou o pedido de ".self::TIPOS[$pedido->tipo].($dono ? " de {$dono->nome}" : '').' de '.$this->periodo($pedido), $user, $dono);

        return response()->json(null, 204);
    }

    /** O funcionario cancela ferias suas ja aprovadas. */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->where('user_id', $user->id)->findOrFail($id);

        abort_if($pedido->tipo !== 'ferias' || $pedido->estado !== 'aprovado', 409, 'Só é possível cancelar férias aprovadas.');

        $pedido->update(['estado' => 'cancelado']);
        RegistoAtividade::registar('pedido', "{$user->nome} cancelou as férias de {$this->periodo($pedido)}", $user);

        return response()->json(['data' => $pedido->refresh()]);
    }

    private function pedidoPendenteDoUtilizador(Request $request, int $id, bool $licencaPorComecar = false): Pedido
    {
        $user = $request->user();
        // 404 para pedidos de outros utilizadores ou empresas (nao revela existencia). Quem tem pedir_por_outros
        // alcança também os que criou em nome de outros.
        $pedido = Pedido::where('empresa_id', $user->empresa_id)
            ->where(fn ($q) => $q->where('user_id', $user->id)->when(
                $user->temPermissao('pedir_por_outros'),
                fn ($q) => $q->orWhere('criado_por', $user->id),
            ))->findOrFail($id);

        // O cancelamento extra (admin / licença por começar) é só para pedidos próprios.
        $cancelavel = $licencaPorComecar && $pedido->user_id === $user->id && ($user->isAdmin() || ($pedido->tipo === 'licenca'
            && $pedido->data_inicio->format('Y-m-d') >= now('Europe/Lisbon')->toDateString()));
        abort_if($pedido->estado !== 'pendente' && ! $cancelavel, 409, 'Só é possível alterar pedidos pendentes.');

        return $pedido;
    }

    /** O admin marca que viu o aviso de uma licença. */
    public function visto(Request $request, int $id): JsonResponse
    {
        $pedido = Pedido::where('empresa_id', $request->user()->empresa_id)->where('tipo', 'licenca')->findOrFail($id);
        $pedido->visto_em ??= now();
        $pedido->save();

        return response()->json(['data' => $pedido->refresh()]);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, ['estado' => 'aprovado']);
    }

    public function recusar(RecusarPedidoRequest $request, int $id): JsonResponse
    {
        return $this->decidir($request, $id, ['estado' => 'recusado', 'motivo_recusa' => $request->validated('motivo_recusa')]);
    }

    private function decidir(Request $request, int $id, array $campos): JsonResponse
    {
        $user = $request->user();
        // 404 para pedidos de outra empresa ou de funcionarios apagados (nao revela existencia).
        $pedido = Pedido::where('empresa_id', $user->empresa_id)->whereHas('user')->findOrFail($id);

        abort_if($pedido->user_id === $user->id, 403, 'Não pode decidir um pedido seu.');
        abort_if($pedido->estado !== 'pendente', 409, 'O pedido já foi decidido.');

        $pedido->update([...$campos, 'decidido_por' => $user->id, 'decidido_em' => now()]);
        $dono = User::withTrashed()->find($pedido->user_id);
        $verbo = $campos['estado'] === 'aprovado' ? 'aprovou' : 'recusou';
        RegistoAtividade::registar('pedido', "{$user->nome} {$verbo} o pedido de ".self::TIPOS[$pedido->tipo]." de {$dono?->nome}", $user, $dono);

        return response()->json(['data' => $pedido->refresh()->load('autor:id,nome')]);
    }
}
