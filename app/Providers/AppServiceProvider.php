<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        VerifyEmail::toMailUsing(fn ($user, string $url) => (new MailMessage)
            ->subject('Confirme o seu email — vatech')
            ->greeting('Olá, '.$user->nome.'!')
            ->line('Para ativar a sua conta, confirme o seu endereço de email.')
            ->action('Confirmar email', $url)
            ->line('Se não criou esta conta, ignore este email.')
            ->salutation('vatech'));

        // O link do email abre o site (Next.js), não a API.
        ResetPassword::toMailUsing(function ($user, string $token) {
            $url = rtrim((string) config('app.frontend_url'), '/')
                .'/redefinir?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset());

            return (new MailMessage)
                ->subject('Recuperar palavra-passe — vatech')
                ->greeting('Olá, '.$user->nome.'!')
                ->line('Recebemos um pedido para definir uma nova palavra-passe da sua conta.')
                ->action('Definir nova palavra-passe', $url)
                ->line('O link expira em '.config('auth.passwords.users.expire').' minutos.')
                ->line('Se não pediu isto, ignore este email: a sua palavra-passe não muda.')
                ->salutation('vatech');
        });
    }
}
