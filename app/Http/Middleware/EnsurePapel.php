<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePapel
{
    public function handle(Request $request, Closure $next, string ...$papeis): Response
    {
        abort_unless(in_array($request->user()?->papel, $papeis, true), 403, 'Sem permissao.');

        return $next($request);
    }
}
