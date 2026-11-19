<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFuncionarioRequest extends FormRequest
{
    // Corre antes da validacao: 404 (e nao 422) para alheio ou inexistente.
    public function authorize(): bool
    {
        abort_unless(
            User::where('empresa_id', $this->user()->empresa_id)->whereKey($this->route('id'))->exists(),
            404,
        );

        return true;
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('id'))],
            'password' => ['sometimes', 'string', 'min:8'],
            'papel' => ['sometimes', Rule::in(['admin', 'funcionario', 'estagiario'])],
        ];
    }
}
