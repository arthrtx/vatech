<?php

use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AnexoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompromissoController;
use App\Http\Controllers\ConviteController;
use App\Http\Controllers\DefinicoesConviteController;
use App\Http\Controllers\DefinicoesPermissoesController;
use App\Http\Controllers\EstagioController;
use App\Http\Controllers\FichaRhController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\HistoricoController;
use App\Http\Controllers\HorarioController;
use App\Http\Controllers\LimiteController;
use App\Http\Controllers\OcorrenciaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PonteController;
use App\Http\Controllers\PresencaController;
use App\Http\Controllers\RhResumoController;
use App\Http\Controllers\TextoController;
use App\Http\Controllers\TipoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/convites/{token}', [ConviteController::class, 'mostrar'])->middleware('throttle:30,1');
Route::post('/convites/{token}/aceitar', [ConviteController::class, 'aceitar'])->middleware('throttle:10,1');
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
    Route::post('/texto/melhorar', [TextoController::class, 'melhorar'])->middleware(['permissao:melhorar_texto', 'throttle:10,1']);
    Route::get('/pedidos', [PedidoController::class, 'index']);
    Route::get('/pedidos/pessoas', [PedidoController::class, 'pessoas'])->middleware('permissao:pedir_por_outros');
    Route::get('/limites', [LimiteController::class, 'index']);
    Route::get('/agenda', [AgendaController::class, 'index']);
    Route::get('/aniversarios', [AgendaController::class, 'aniversarios']);
    Route::get('/estagios', [EstagioController::class, 'index']);
    Route::get('/pontes', [PonteController::class, 'index']);
    Route::get('/horario', [HorarioController::class, 'show']);
    Route::get('/compromissos', [CompromissoController::class, 'index']);
    Route::post('/compromissos', [CompromissoController::class, 'store'])->middleware(['permissao:criar_compromissos', 'throttle:60,1']);
    Route::delete('/compromissos/{id}', [CompromissoController::class, 'destroy'])->middleware('permissao:criar_compromissos');
    Route::get('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'download']);

    Route::middleware('papel:admin')->group(function () {
        Route::get('/definicoes/convite', [DefinicoesConviteController::class, 'show']);
        Route::put('/definicoes/convite', [DefinicoesConviteController::class, 'update']);
        Route::put('/definicoes/horario', [HorarioController::class, 'update']);
        Route::get('/definicoes/horarios', [HorarioController::class, 'index']);
        Route::put('/definicoes/horarios/{id}', [HorarioController::class, 'updatePessoa'])->whereNumber('id');
        Route::get('/ferias-resumo', [LimiteController::class, 'feriasResumo']);
        Route::get('/funcionarios', [FuncionarioController::class, 'index']);
        Route::post('/funcionarios/{id}/aprovar', [FuncionarioController::class, 'aprovar']);
        Route::post('/funcionarios/{id}/recusar', [FuncionarioController::class, 'recusar']);
        Route::get('/definicoes/tipos', [TipoController::class, 'index']);
        Route::post('/definicoes/tipos', [TipoController::class, 'store']);
        Route::put('/definicoes/tipos/{id}', [TipoController::class, 'update']);
        Route::delete('/definicoes/tipos/{id}', [TipoController::class, 'destroy']);
        Route::put('/funcionarios/{id}/tipo', [TipoController::class, 'definirDaPessoa']);
        Route::put('/funcionarios/{id}/estagio', [EstagioController::class, 'update'])->whereNumber('id');
        Route::get('/historico', [HistoricoController::class, 'index']);
        Route::delete('/historico', [HistoricoController::class, 'destroy']);
        Route::get('/definicoes/permissoes', [DefinicoesPermissoesController::class, 'show']);
        Route::put('/definicoes/permissoes', [DefinicoesPermissoesController::class, 'update']);
    });

    // Gestão delegável: o admin tem sempre estas permissões, os outros papéis só se o admin as der.
    Route::middleware('papel:admin,funcionario,estagiario')->group(function () {
        Route::middleware('permissao:convidar_pessoas')->group(function () {
            Route::get('/funcionarios/convites', [ConviteController::class, 'index']);
            Route::post('/funcionarios/convites', [ConviteController::class, 'store'])->middleware('throttle:20,1');
            Route::post('/funcionarios/convites/{id}/reenviar', [ConviteController::class, 'reenviar'])->middleware('throttle:20,1');
            Route::delete('/funcionarios/convites/{id}', [ConviteController::class, 'destroy']);
        });
        Route::middleware('permissao:aprovar_pedidos')->group(function () {
            Route::post('/pedidos/{id}/aprovar', [PedidoController::class, 'aprovar']);
            Route::post('/pedidos/{id}/visto', [PedidoController::class, 'visto']);
            Route::post('/pedidos/{id}/recusar', [PedidoController::class, 'recusar']);
        });
        Route::delete('/funcionarios/{id}', [FuncionarioController::class, 'destroy'])->whereNumber('id')->middleware('permissao:apagar_pessoas');
        Route::middleware('permissao:gerir_pontes')->group(function () {
            Route::post('/pontes', [PonteController::class, 'store']);
            Route::delete('/pontes/{id}', [PonteController::class, 'destroy']);
        });
    });

    // Fichas de RH: quem tem gerir_rh vê e edita as de toda a empresa.
    Route::middleware('permissao:gerir_rh')->group(function () {
        Route::get('/rh/fichas', [FichaRhController::class, 'index']);
        Route::get('/rh/fichas/{userId}', [FichaRhController::class, 'show']);
        Route::get('/rh/fichas/{userId}/resumo', RhResumoController::class)->whereNumber('userId');
        Route::post('/rh/fichas/{userId}/infos', [FichaRhController::class, 'storeInfo']);
        Route::put('/rh/infos/{id}', [FichaRhController::class, 'updateInfo']);
        Route::delete('/rh/infos/{id}', [FichaRhController::class, 'destroyInfo']);
        Route::post('/rh/fichas/{userId}/ficheiros', [FichaRhController::class, 'storeFicheiro'])->middleware('throttle:30,1');
        Route::get('/rh/ficheiros/{id}/download', [FichaRhController::class, 'download']);
        Route::delete('/rh/ficheiros/{id}', [FichaRhController::class, 'destroyFicheiro']);
    });

    // Todos marcam a sua presença; o admin vê a da empresa, os outros só a sua.
    Route::middleware('papel:admin,funcionario,estagiario')->group(function () {
        Route::get('/presencas', [PresencaController::class, 'index']);
        Route::get('/ocorrencias', [OcorrenciaController::class, 'index']);
        Route::middleware('permissao:marcar_presenca')->group(function () {
            Route::get('/presencas/hoje', [PresencaController::class, 'hoje']);
            Route::post('/presencas/entrada', [PresencaController::class, 'entrada']);
            Route::post('/presencas/saida', [PresencaController::class, 'saida']);
            Route::post('/presencas/atrasada', [PresencaController::class, 'atrasada']);
        });
        Route::post('/ocorrencias', [OcorrenciaController::class, 'store'])->middleware('permissao:registar_ocorrencias');
    });

    // O admin também marca as suas férias, ausências e licenças (ficam aprovadas logo).
    Route::middleware('papel:funcionario,estagiario,admin')->group(function () {
        Route::post('/pedidos', [PedidoController::class, 'store']);
        Route::put('/pedidos/{id}', [PedidoController::class, 'update']);
        Route::delete('/pedidos/{id}', [PedidoController::class, 'destroy']);
        Route::post('/pedidos/{id}/cancelar', [PedidoController::class, 'cancelar']);
        Route::post('/pedidos/{id}/anexos', [AnexoController::class, 'store'])->middleware(['permissao:anexar_documentos', 'throttle:20,1']);
        Route::delete('/pedidos/{id}/anexos/{anexo}', [AnexoController::class, 'destroy'])->middleware('permissao:anexar_documentos');
    });
});
