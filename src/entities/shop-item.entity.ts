import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Tipos de item da Loja Botânica:
 *  WATER / FOOD  → consumíveis: restauram os níveis do pet (restoreAmount)
 *  SKIN          → espécie da planta (cacto, girassol, carnívora...)
 *  BACKGROUND    → cenário (quarto, jardim, espaço...)
 *  EFFECT        → efeito visual equipável (máquina de bolhas, vagalumes...)
 */
export enum ShopItemType {
  WATER = 'water',
  FOOD = 'food',
  SKIN = 'skin',
  BACKGROUND = 'background',
  EFFECT = 'effect',
}

@Entity('shop_items')
@Index(['familyId', 'type'])
export class ShopItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // null = item do catálogo padrão (todas as famílias);
  // preenchido = item customizado criado pelo responsável
  @Column({ name: 'family_id', type: 'text', nullable: true })
  familyId: string | null;

  @Column({
    type: 'text',
  })
  type: ShopItemType;

  @Column()
  name: string;

  @Column({ default: '🌱' })
  emoji: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Preço em estrelas
  @Column({ type: 'int' })
  price: number;

  // Quanto o consumível restaura (0–100); ignorado em cosméticos
  @Column({ name: 'restore_amount', type: 'int', default: 0 })
  restoreAmount: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
