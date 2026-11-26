<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['nome', 'texto_convite'])]
class Empresa extends Model
{
    use HasFactory;

    public const TEXTO_CONVITE_PREDEFINIDO = 'Bem-vindo à equipa. Defina a sua palavra-passe para criar a conta. O administrador autoriza o seu acesso a seguir.';

    public function textoConvite(): string
    {
        return $this->texto_convite ?: self::TEXTO_CONVITE_PREDEFINIDO;
    }
}
