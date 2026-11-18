<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePapel
{
    public function handle(Request $request, Closure $next, string $papel): Response
    {
        abort_unless($request->user()?->papel === $papel, 403, 'Sem permissao.');

        return $next($request);
    }
}
