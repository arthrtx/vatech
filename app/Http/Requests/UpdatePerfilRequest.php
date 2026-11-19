<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePerfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'password_atual' => ['required_with:password', 'nullable', 'string'],
            'data_nascimento' => ['nullable', 'date_format:Y-m-d', 'after:1900-01-01', 'before_or_equal:today'],
            'estagio_inicio' => [Rule::prohibitedIf($this->user()->papel !== 'estagiario'), 'nullable', 'date_format:Y-m-d'],
            'estagio_fim' => [Rule::prohibitedIf($this->user()->papel !== 'estagiario'), 'nullable', 'date_format:Y-m-d', 'after_or_equal:estagio_inicio'],
        ];
    }
}
