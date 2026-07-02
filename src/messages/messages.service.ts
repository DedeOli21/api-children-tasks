import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message, User, UserRole } from '../entities';
import { AccessControlService } from '../auth/access-control.service';
import { SendMessageDto } from './dto/send-message.dto';

// Comunicação professor ↔ terapeuta no contexto de uma criança.
@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private accessControl: AccessControlService,
  ) {}

  private toPublic(message: Message, currentUserId: string) {
    return {
      id: message.id,
      childId: message.childId,
      text: message.text,
      senderId: message.senderId,
      senderName: message.sender?.name,
      senderRole: message.sender?.role,
      mine: message.senderId === currentUserId,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }

  async send(sender: User, dto: SendMessageDto) {
    // Ambos os lados precisam de vínculo com a criança
    const child = await this.accessControl.resolveChild(sender, dto.childId);

    const recipient = await this.userRepository.findOne({
      where: { id: dto.recipientId },
    });
    if (!recipient) {
      throw new NotFoundException('Destinatário não encontrado');
    }
    if (recipient.role !== UserRole.TEACHER && recipient.role !== UserRole.THERAPIST) {
      throw new BadRequestException('Mensagens são apenas entre professor e terapeuta');
    }
    if (recipient.id === sender.id) {
      throw new BadRequestException('Você não pode enviar mensagem para si');
    }
    // Destinatário também deve estar vinculado à mesma criança
    await this.accessControl.resolveChild(recipient, child.id);

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        childId: child.id,
        senderId: sender.id,
        recipientId: recipient.id,
        text: dto.text,
      }),
    );

    return this.toPublic({ ...message, sender } as Message, sender.id);
  }

  // Adultos vinculados à criança que podem trocar mensagens comigo
  async contacts(actor: User, childId: string) {
    const child = await this.accessControl.resolveChild(actor, childId);

    const [teachers, therapists] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .innerJoin('teacher_students', 'link', 'link.teacher_id = user.id')
        .where('link.child_id = :childId', { childId: child.id })
        .getMany(),
      this.userRepository
        .createQueryBuilder('user')
        .innerJoin('therapist_children', 'link', 'link.therapist_id = user.id')
        .where('link.child_id = :childId', { childId: child.id })
        .getMany(),
    ]);

    return [...teachers, ...therapists]
      .filter((user) => user.id !== actor.id)
      .map((user) => ({ id: user.id, name: user.name, role: user.role }));
  }

  // Conversa com outro adulto sobre a criança; marca recebidas como lidas
  async thread(actor: User, childId: string, withUserId: string) {
    const child = await this.accessControl.resolveChild(actor, childId);

    const messages = await this.messageRepository.find({
      where: [
        { childId: child.id, senderId: actor.id, recipientId: withUserId },
        { childId: child.id, senderId: withUserId, recipientId: actor.id },
      ],
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: 200,
    });

    await this.messageRepository.update(
      { childId: child.id, senderId: withUserId, recipientId: actor.id, readAt: IsNull() },
      { readAt: new Date() },
    );

    return messages.map((message) => this.toPublic(message, actor.id));
  }

  // Contador de não-lidas para o badge do inbox
  async unreadCount(actor: User) {
    const count = await this.messageRepository.count({
      where: { recipientId: actor.id, readAt: IsNull() },
    });
    return { unread: count };
  }
}
