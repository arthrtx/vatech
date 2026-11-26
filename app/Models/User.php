<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['nome', 'email', 'password', 'empresa_id', 'papel', 'avatar_path', 'data_nascimento', 'estagio_inicio', 'estagio_fim', 'instituicao_ensino', 'horario_entrada', 'horario_saida', 'horario_almoco_inicio', 'almoco_minutos', 'email_verified_at', 'termos_aceites_em', 'tipo_id', 'cargo'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /** Cargos válidos; "CEO" é reservado ao admin. */
    public const CARGOS = ['Designer gráfico', 'RH', 'Desenvolvedor', 'Diretora comercial', 'Marketing', 'Programador', 'CEO'];

    public function isAdmin(): bool
    {
        return $this->papel === 'admin';
    }

    /** O admin tem sempre tudo; os outros papéis, o que o admin da empresa definir. */
    public function temPermissao(string $chave): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return (bool) ($this->permissoesEfectivas()[$chave] ?? false);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function tipo(): BelongsTo
    {
        return $this->belongsTo(Tipo::class);
    }

    public function rhInfos(): HasMany
    {
        return $this->hasMany(RhInfo::class);
    }

    public function rhFicheiros(): HasMany
    {
        return $this->hasMany(RhFicheiro::class);
    }

    /**
     * Do tipo, se tiver; senão do papel na empresa.
     *
     * @return array<string,bool>
     */
    private function permissoesEfectivas(): array
    {
        if ($this->tipo_id && $tipo = $this->tipo) {
            return $tipo->permissoesEfectivas();
        }

        $empresa = $this->relationLoaded('empresa') ? $this->empresa : Empresa::find($this->empresa_id);

        return $empresa?->permissoesDoPapel((string) $this->papel) ?? [];
    }

    /** @return list<string> */
    public function permissoes(): array
    {
        if ($this->isAdmin()) {
            return Empresa::chavesPermissoes();
        }

        return array_keys(array_filter($this->permissoesEfectivas()));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'termos_aceites_em' => 'datetime',
            'password' => 'hashed',
            'data_nascimento' => 'date:Y-m-d',
            'estagio_inicio' => 'date:Y-m-d',
            'estagio_fim' => 'date:Y-m-d',
        ];
    }

    /**
     * Horário efectivo: o da pessoa ou, campo a campo, o da empresa (precisa da relação `empresa` carregada).
     *
     * @return array{entrada:string,saida:string,almoco_inicio:string,almoco_min:int}
     */
    public function horario(): array
    {
        $e = $this->empresa->horario();

        return [
            'entrada' => $this->horario_entrada ? substr($this->horario_entrada, 0, 5) : $e['entrada'],
            'saida' => $this->horario_saida ? substr($this->horario_saida, 0, 5) : $e['saida'],
            'almoco_inicio' => $this->horario_almoco_inicio ? substr($this->horario_almoco_inicio, 0, 5) : $e['almoco_inicio'],
            'almoco_min' => $this->almoco_minutos ?? $e['almoco_min'],
        ];
    }

    /** @return array{id:int,nome:string,email:string,papel:string,empresa_id:int|null,avatar_url:string|null,data_nascimento:string|null,estagio_inicio:string|null,estagio_fim:string|null,instituicao_ensino:string|null,estado_conta:string,cargo:string|null,permissoes:list<string>,tipo:array{id:int,nome:string}|null} */
    public function toContrato(): array
    {
        return $this->only(['id', 'nome', 'email', 'papel', 'empresa_id']) + [
            'estado_conta' => $this->estado_conta ?? 'aprovado',
            'cargo' => $this->cargo ?? ($this->isAdmin() ? 'CEO' : null),
            'permissoes' => $this->permissoes(),
            'tipo' => $this->tipo_id && $this->tipo ? ['id' => $this->tipo->id, 'nome' => $this->tipo->nome] : null,
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'data_nascimento' => $this->data_nascimento?->format('Y-m-d'),
            'estagio_inicio' => $this->estagio_inicio?->format('Y-m-d'),
            'estagio_fim' => $this->estagio_fim?->format('Y-m-d'),
            'instituicao_ensino' => $this->instituicao_ensino,
        ];
    }
}
