<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AgendaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'de' => ['required', 'date_format:Y-m-d'],
            'ate' => ['required', 'date_format:Y-m-d', 'after_or_equal:de'],
        ];
    }

    public function messages(): array
    {
        return [
            'de.required' => 'A data inicial é obrigatória.',
            'de.date_format' => 'A data inicial tem de estar no formato AAAA-MM-DD.',
            'ate.required' => 'A data final é obrigatória.',
            'ate.date_format' => 'A data final tem de estar no formato AAAA-MM-DD.',
            'ate.after_or_equal' => 'A data final não pode ser anterior à data inicial.',
        ];
    }
}
