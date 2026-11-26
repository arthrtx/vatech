<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StorePedidoRequest extends FormRequest
{
    /** Cada tipo de pedido tem a sua permissão; tipo desconhecido segue para a validação (422). */
    public function authorize(): bool
    {
        $chave = ['ferias' => 'pedir_ferias', 'ausencia' => 'pedir_ausencia', 'licenca' => 'pedir_licenca'][$this->input('tipo')] ?? null;

        return $chave === null || (bool) $this->user()?->temPermissao($chave);
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json(['message' => 'Sem permissão.'], 403));
    }

    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['ferias', 'ausencia', 'licenca'])],
            'subtipo' => ['nullable', Rule::in(['medica', 'documentacao', 'falta_justificada'])],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
            // Horas opcionais; o fim é obrigatório com o início e vem depois dele.
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fim' => ['nullable', 'date_format:H:i', 'required_with:hora_inicio', 'after:hora_inicio'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'urgente' => ['nullable', 'boolean'],
            // Cor escolhida pelo utilizador para o calendario da equipa.
            'cor' => ['nullable', Rule::in(['verde', 'violeta', 'laranja', 'pessego', 'escuro'])],
        ];
    }
}
