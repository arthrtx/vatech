<?php

namespace App\Http\Requests;

use App\Models\Presenca;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePresencaAtrasadaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'data' => ['required', 'date_format:Y-m-d'],
            'entrada' => ['required', 'date_format:H:i'],
            'saida' => ['required', 'date_format:H:i'],
        ];
    }

    public function messages(): array
    {
        return [
            'data.required' => 'Indique o dia.',
            'data.date_format' => 'Dia invalido.',
            'entrada.required' => 'Indique a hora de entrada.',
            'entrada.date_format' => 'Hora de entrada invalida.',
            'saida.required' => 'Indique a hora de saida.',
            'saida.date_format' => 'Hora de saida invalida.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $agora = CarbonImmutable::now('Europe/Lisbon');
            $dia = $this->input('data');
            $inicio = $this->user()->estagio_inicio?->format('Y-m-d');

            if ($dia > $agora->toDateString()) {
                $validator->errors()->add('data', 'Nao pode registar presencas em dias futuros.');
            } elseif ($inicio && $dia < $inicio) {
                $validator->errors()->add('data', 'O dia e anterior ao inicio do estagio.');
            } elseif (Presenca::where('user_id', $this->user()->id)->where('data', $dia)->exists()) {
                $validator->errors()->add('data', 'Ja existe presenca nesse dia.');
            } elseif ($this->input('entrada') >= $this->input('saida')) {
                $validator->errors()->add('saida', 'A saida tem de ser depois da entrada.');
            } elseif ($dia === $agora->toDateString()) {
                foreach (['entrada', 'saida'] as $campo) {
                    if ($this->instante($campo) > $agora) {
                        $validator->errors()->add($campo, 'A hora nao pode estar no futuro.');
                    }
                }
            }
        }];
    }

    // Hora introduzida em Lisboa, gravada em UTC.
    public function instante(string $campo): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d H:i', $this->input('data').' '.$this->input($campo), 'Europe/Lisbon')->utc();
    }
}
