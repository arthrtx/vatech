<?php

use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AnexoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompromissoController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\LimiteController;
use App\Http\Controllers\OcorrenciaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PonteController;
use App\Http\Controllers\PresencaController;
use App\Http\Controllers\TextoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/registo', [AuthController::class, 'registo'])->middleware('throttle:5,1');
Route::post('/email/reenviar', [AuthController::class, 'reenviarVerificacao'])->middleware('throttle:5,1');
Route::get('/email/verificar/{id}/{hash}', [AuthController::class, 'verificarEmail'])->name('verification.verify');
Route::post('/esqueci-password', [AuthController::class, 'esqueciPassword'])->middleware('throttle:5,1');
Route::post('/redefinir-password', [AuthController::class, 'redefinirPassword'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateMe'])->middleware('throttle:5,1');
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar'])->middleware('throttle:10,1');
    Route::delete('/me/avatar', [AuthController::class, 'destroyAvatar'])->middleware('throttle:10,1');
    Route::post('/texto/melhorar', [TextoController::class, 'melhorar'])->middleware('throttle:10,1');
    Route::get('/pedidos', [PedidoController::class, 'index']);
    Route::get('/limites', [LimiteController::class, 'index']);
    Route::get('/agenda', [AgendaController::class, 'index']);
    Route::get('/aniversarios', [AgendaController::class, 'aniversarios']);
    Route::get('/pontes', [PonteController::class, 'index']);
    Route::get('/compromissos', [CompromissoController::class, 'index']);
    Route::post('/compromissos', [CompromissoController::class, 'store'])->middleware('throttle:60,1');
    Route::delete('/compromissos/{id}', [CompromissoController::class, 'destroy']);
    Route::get('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'download']);

    Route::middleware('papel:admin')->group(function () {
        Route::put('/limites', [LimiteController::class, 'update']);
        Route::get('/ferias-resumo', [LimiteController::class, 'feriasResumo']);
        Route::post('/pontes', [PonteController::class, 'store']);
        Route::delete('/pontes/{id}', [PonteController::class, 'destroy']);
        Route::get('/funcionarios', [FuncionarioController::class, 'index']);
        Route::post('/pedidos/{id}/aprovar', [PedidoController::class, 'aprovar']);
        Route::post('/pedidos/{id}/visto', [PedidoController::class, 'visto']);
        Route::post('/pedidos/{id}/recusar', [PedidoController::class, 'recusar']);
    });

    // Todos marcam a sua presença; o admin vê a da empresa, os outros só a sua.
    Route::middleware('papel:admin,funcionario,estagiario')->group(function () {
        Route::get('/presencas', [PresencaController::class, 'index']);
        Route::get('/ocorrencias', [OcorrenciaController::class, 'index']);
        Route::get('/presencas/hoje', [PresencaController::class, 'hoje']);
        Route::post('/presencas/entrada', [PresencaController::class, 'entrada']);
        Route::post('/presencas/saida', [PresencaController::class, 'saida']);
        Route::post('/presencas/atrasada', [PresencaController::class, 'atrasada']);
        Route::put('/me/almoco', [PresencaController::class, 'almoco']);
        Route::post('/ocorrencias', [OcorrenciaController::class, 'store']);
    });

    // O admin também marca as suas férias, ausências e licenças (ficam aprovadas logo).
    Route::middleware('papel:funcionario,estagiario,admin')->group(function () {
        Route::post('/pedidos', [PedidoController::class, 'store']);
        Route::put('/pedidos/{id}', [PedidoController::class, 'update']);
        Route::delete('/pedidos/{id}', [PedidoController::class, 'destroy']);
        Route::post('/pedidos/{id}/cancelar', [PedidoController::class, 'cancelar']);
        Route::post('/pedidos/{id}/anexos', [AnexoController::class, 'store'])->middleware('throttle:20,1');
        Route::delete('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'destroy']);
    });
});
