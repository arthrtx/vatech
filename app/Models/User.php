<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['nome', 'email', 'password', 'empresa_id', 'papel', 'avatar_path', 'estagio_inicio', 'estagio_fim'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
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
            'password' => 'hashed',
            'estagio_inicio' => 'date:Y-m-d',
            'estagio_fim' => 'date:Y-m-d',
        ];
    }

    /** @return array{id:int,nome:string,email:string,papel:string,empresa_id:int|null,avatar_url:string|null,estagio_inicio:string|null,estagio_fim:string|null} */
    public function toContrato(): array
    {
        return $this->only(['id', 'nome', 'email', 'papel', 'empresa_id']) + [
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'estagio_inicio' => $this->estagio_inicio?->format('Y-m-d'),
            'estagio_fim' => $this->estagio_fim?->format('Y-m-d'),
        ];
    }
}
