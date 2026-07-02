import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  // Criança que dá contexto à conversa
  @IsUUID(undefined, { message: 'childId inválido' })
  childId: string;

  @IsUUID(undefined, { message: 'recipientId inválido' })
  recipientId: string;

  @IsString()
  @IsNotEmpty({ message: 'A mensagem não pode ser vazia' })
  text: string;
}
