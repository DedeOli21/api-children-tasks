import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { PetItem, PetAttachmentSlot } from './pet-item.entity';

export enum PetItemAcquisitionSource {
  SHOP = 'shop',
  DROP = 'drop',
  ADMIN = 'admin',
  REWARD = 'reward',
}

/**
 * Inventário moderno do Pet. Uma linha representa posse de um PetItem.
 * O serviço de equipar deve atualizar essa tabela e o snapshot
 * VirtualPet.equippedItems na mesma transação.
 */
@Entity('pet_inventory_items')
@Index(['childId', 'petItemId'], { unique: true })
@Index(['childId', 'equippedSlot'])
export class PetInventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'pet_item_id' })
  petItemId: string;

  @ManyToOne(() => PetItem, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'pet_item_id' })
  petItem: PetItem;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ default: false })
  equipped: boolean;

  @Column({ name: 'equipped_slot', type: 'text', nullable: true })
  equippedSlot: PetAttachmentSlot | null;

  @Column({
    name: 'acquisition_source',
    type: 'text',
    default: PetItemAcquisitionSource.DROP,
  })
  acquisitionSource: PetItemAcquisitionSource;

  @Column({
    name: 'acquired_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  acquiredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
