<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['nome', 'email', 'password', 'empresa_id', 'papel', 'avatar_path', 'data_nascimento', 'estagio_inicio', 'estagio_fim', 'almoco_inicio', 'almoco_fim', 'email_verified_at', 'termos_aceites_em'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public function isAdmin(): bool
    {
        return $this->papel === 'admin';
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

    /** @return array{id:int,nome:string,email:string,papel:string,empresa_id:int|null,avatar_url:string|null,data_nascimento:string|null,estagio_inicio:string|null,estagio_fim:string|null,almoco_inicio:string|null,almoco_fim:string|null} */
    public function toContrato(): array
    {
        return $this->only(['id', 'nome', 'email', 'papel', 'empresa_id']) + [
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'data_nascimento' => $this->data_nascimento?->format('Y-m-d'),
            'estagio_inicio' => $this->estagio_inicio?->format('Y-m-d'),
            'estagio_fim' => $this->estagio_fim?->format('Y-m-d'),
            'almoco_inicio' => $this->almoco_inicio ? substr($this->almoco_inicio, 0, 5) : null,
            'almoco_fim' => $this->almoco_fim ? substr($this->almoco_fim, 0, 5) : null,
        ];
    }
}
