<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['nome', 'texto_convite', 'permissoes'])]
class Empresa extends Model
{
    use HasFactory;

    public const TEXTO_CONVITE_PREDEFINIDO = 'Bem-vindo à equipa. Defina a sua palavra-passe para criar a conta. O administrador autoriza o seu acesso a seguir.';

    /** Permissões que o admin pode dar ou tirar a cada papel: [chave, rótulo, grupo]. */
    public const PERMISSOES_CATALOGO = [
        ['pedir_ferias', 'Pedir férias', 'dia_a_dia'],
        ['pedir_ausencia', 'Pedir ausências', 'dia_a_dia'],
        ['pedir_licenca', 'Pedir licenças', 'dia_a_dia'],
        ['anexar_documentos', 'Anexar documentos aos pedidos', 'dia_a_dia'],
        ['marcar_presenca', 'Marcar presença', 'dia_a_dia'],
        ['registar_ocorrencias', 'Registar ocorrências', 'dia_a_dia'],
        ['criar_compromissos', 'Criar compromissos no calendário', 'dia_a_dia'],
        ['melhorar_texto', 'Usar o melhorador de texto', 'dia_a_dia'],
        ['aprovar_pedidos', 'Aprovar e recusar pedidos da equipa', 'gestao'],
        ['ver_presencas_empresa', 'Ver as presenças de toda a empresa', 'gestao'],
        ['gerir_pontes', 'Gerir pontes', 'gestao'],
        ['convidar_pessoas', 'Convidar pessoas (convites)', 'gestao'],
    ];

    public const PAPEIS_EDITAVEIS = ['funcionario', 'estagiario'];

    /** @return list<string> */
    public static function chavesPermissoes(): array
    {
        return array_column(self::PERMISSOES_CATALOGO, 0);
    }

    /** @return array<string,bool> */
    public static function permissoesPredefinidas(string $papel): array
    {
        $predefinido = [];
        foreach (self::PERMISSOES_CATALOGO as [$chave, , $grupo]) {
            $predefinido[$chave] = $grupo === 'dia_a_dia' && ! ($papel === 'estagiario' && $chave === 'pedir_ferias');
        }

        return $predefinido;
    }

    /**
     * Permissões de um papel: o que o admin gravou por cima dos predefinidos.
     *
     * @return array<string,bool>
     */
    public function permissoesDoPapel(string $papel): array
    {
        $guardado = $this->permissoes[$papel] ?? [];

        return array_replace(
            self::permissoesPredefinidas($papel),
            array_intersect_key(array_map('boolval', $guardado), array_flip(self::chavesPermissoes())),
        );
    }

    /** @return array<string,array<string,bool>> */
    public function permissoesPorPapel(): array
    {
        return collect(self::PAPEIS_EDITAVEIS)->mapWithKeys(fn (string $p) => [$p => $this->permissoesDoPapel($p)])->all();
    }

    protected function casts(): array
    {
        return ['permissoes' => 'array'];
    }

    public function textoConvite(): string
    {
        return $this->texto_convite ?: self::TEXTO_CONVITE_PREDEFINIDO;
    }
}
