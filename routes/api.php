<?php

use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AnexoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\PedidoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateMe'])->middleware('throttle:5,1');
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar'])->middleware('throttle:10,1');
    Route::delete('/me/avatar', [AuthController::class, 'destroyAvatar'])->middleware('throttle:10,1');
    Route::get('/pedidos', [PedidoController::class, 'index']);
    Route::get('/agenda', [AgendaController::class, 'index']);
    Route::get('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'download']);

    Route::middleware('papel:admin')->group(function () {
        Route::get('/funcionarios', [FuncionarioController::class, 'index']);
        Route::post('/funcionarios', [FuncionarioController::class, 'store']);
        Route::put('/funcionarios/{id}', [FuncionarioController::class, 'update']);
        Route::delete('/funcionarios/{id}', [FuncionarioController::class, 'destroy']);
        Route::post('/pedidos/{id}/aprovar', [PedidoController::class, 'aprovar']);
        Route::post('/pedidos/{id}/recusar', [PedidoController::class, 'recusar']);
    });

    Route::middleware('papel:funcionario')->group(function () {
        Route::post('/pedidos', [PedidoController::class, 'store']);
        Route::put('/pedidos/{id}', [PedidoController::class, 'update']);
        Route::delete('/pedidos/{id}', [PedidoController::class, 'destroy']);
        Route::post('/pedidos/{id}/anexos', [AnexoController::class, 'store'])->middleware('throttle:20,1');
        Route::delete('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'destroy']);
    });
});
