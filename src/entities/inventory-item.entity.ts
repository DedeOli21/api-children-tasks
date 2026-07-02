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
import { ShopItem } from './shop-item.entity';

/**
 * Posse de um item da loja pela criança.
 * - Consumíveis (água/comida) acumulam em quantity e são decrementados
 *   ao usar na planta.
 * - Cosméticos (skin/cenário/efeito) têm quantity 1 e usam equipped;
 *   o serviço garante no máximo um equipado por tipo por criança.
 */
@Entity('inventory_items')
@Index(['childId', 'shopItemId'], { unique: true })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'child_id' })
  childId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_id' })
  child: User;

  @Column({ name: 'shop_item_id' })
  shopItemId: string;

  @ManyToOne(() => ShopItem, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'shop_item_id' })
  shopItem: ShopItem;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ default: false })
  equipped: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
