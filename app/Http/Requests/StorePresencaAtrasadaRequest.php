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
            'data.date_format' => 'Dia inválido.',
            'entrada.required' => 'Indique a hora de entrada.',
            'entrada.date_format' => 'Hora de entrada inválida.',
            'saida.required' => 'Indique a hora de saída.',
            'saida.date_format' => 'Hora de saída inválida.',
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
                $validator->errors()->add('data', 'Não pode registar presenças em dias futuros.');
            } elseif ($inicio && $dia < $inicio) {
                $validator->errors()->add('data', 'O dia é anterior ao início do estágio.');
            } elseif ($this->input('entrada') >= $this->input('saida')) {
                $validator->errors()->add('saida', 'A saída tem de ser depois da entrada.');
            } elseif ($this->sobrepoe($dia)) {
                $validator->errors()->add('entrada', 'Esse intervalo sobrepõe-se a outra presença do mesmo dia.');
            } elseif ($dia === $agora->toDateString()) {
                foreach (['entrada', 'saida'] as $campo) {
                    if ($this->instante($campo) > $agora) {
                        $validator->errors()->add($campo, 'A hora não pode estar no futuro.');
                    }
                }
            }
        }];
    }

    /** Há outro período da pessoa nesse dia que se cruza com este (um período aberto não tem fim). */
    private function sobrepoe(string $dia): bool
    {
        $fim = $this->instante('saida')->toDateTimeString();
        $inicio = $this->instante('entrada')->toDateTimeString();

        return Presenca::where('user_id', $this->user()->id)->where('data', $dia)
            ->where('entrada', '<', $fim)
            ->where(fn ($q) => $q->whereNull('saida')->orWhere('saida', '>', $inicio))
            ->exists();
    }

    // Hora introduzida em Lisboa, gravada em UTC.
    public function instante(string $campo): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d H:i', $this->input('data').' '.$this->input($campo), 'Europe/Lisbon')->utc();
    }
}
