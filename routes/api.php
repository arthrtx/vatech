<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\PedidoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/pedidos', [PedidoController::class, 'index']);

    Route::middleware('papel:admin')->group(function () {
        Route::get('/funcionarios', [FuncionarioController::class, 'index']);
        Route::post('/funcionarios', [FuncionarioController::class, 'store']);
        Route::post('/pedidos/{id}/aprovar', [PedidoController::class, 'aprovar']);
        Route::post('/pedidos/{id}/recusar', [PedidoController::class, 'recusar']);
    });

    Route::post('/pedidos', [PedidoController::class, 'store'])->middleware('papel:funcionario');
});
