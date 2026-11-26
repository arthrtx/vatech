<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermissao
{
    public function handle(Request $request, Closure $next, string $chave): Response
    {
        if (! $request->user()?->temPermissao($chave)) {
            return response()->json(['message' => 'Sem permissão.'], 403);
        }

        return $next($request);
    }
}
