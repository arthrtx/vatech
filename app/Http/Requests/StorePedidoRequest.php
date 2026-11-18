<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePedidoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['ferias', 'ausencia', 'licenca'])],
            'subtipo' => ['nullable', Rule::in(['medica', 'documentacao', 'falta_justificada'])],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
