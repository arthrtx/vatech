<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecusarPedidoRequest extends FormRequest
{
    public function rules(): array
    {
        return ['motivo_recusa' => ['required', 'string', 'max:2000']];
    }
}
