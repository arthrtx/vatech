<?php

namespace App\Http\Requests;

use App\Support\LimiteFerias;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePedidoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['ferias', 'ausencia', 'licenca']), function ($atributo, $valor, $falha) {
                if ($valor === 'ferias' && $this->user()?->papel === 'estagiario') {
                    $falha('Estagiarios nao podem pedir ferias.');
                }
            }],
            'subtipo' => ['nullable', Rule::in(['medica', 'documentacao', 'falta_justificada'])],
            'data_inicio' => ['required', 'date_format:Y-m-d'],
            'data_fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'urgente' => ['nullable', 'boolean'],
        ];
    }

    /** Ferias: no maximo 22 dias uteis por ano civil (pendentes + aprovadas + este pedido). */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty() || $this->input('tipo') !== 'ferias' || ! $this->user()) {
                return;
            }

            $erro = LimiteFerias::erro(
                $this->user()->id,
                $this->input('data_inicio'),
                $this->input('data_fim'),
                $this->route('id') ? (int) $this->route('id') : null,
            );

            if ($erro) {
                $validator->errors()->add('data_fim', $erro);
            }
        }];
    }
}
