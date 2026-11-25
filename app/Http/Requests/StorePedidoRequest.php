<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePedidoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['ferias', 'ausencia', 'licenca']), function ($atributo, $valor, $falha) {
                if ($valor === 'ferias' && $this->user()?->papel === 'estagiario') {
                    $falha('Estagiários não podem pedir férias.');
                }
            }],
            'subtipo' => ['nullable', Rule::in(['medica', 'documentacao', 'falta_justificada'])],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
            // Horas opcionais; o fim é obrigatório com o início e vem depois dele.
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fim' => ['nullable', 'date_format:H:i', 'required_with:hora_inicio', 'after:hora_inicio'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'urgente' => ['nullable', 'boolean'],
        ];
    }
}
