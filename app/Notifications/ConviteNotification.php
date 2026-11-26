<?php

namespace App\Notifications;

use App\Models\Convite;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ConviteNotification extends Notification
{
    public function __construct(public Convite $convite) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Convite — Nick Fury')
            ->greeting('Olá, '.$this->convite->nome.'!')
            ->line('Foi convidado(a) para aceder ao Nick Fury. Defina a sua palavra-passe e aceite os termos para criar a conta.')
            ->action('Aceitar convite', $this->convite->link())
            ->line('O convite expira a '.$this->convite->expira_em->format('d/m/Y').'.')
            ->line('Depois de criar a conta, o administrador tem de a autorizar antes de poder entrar.')
            ->line('Se não esperava este convite, ignore este email.')
            ->salutation('Nick Fury');
    }
}
