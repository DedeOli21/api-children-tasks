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

export enum FeatureFlagScope {
  GLOBAL = 'global',
  FAMILY = 'family',
}

@Entity('feature_flags')
@Index(['key'], { unique: true })
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: false })
  enabled: boolean;

  @Column({ name: 'premium_gate', default: false })
  premiumGate: boolean;

  @Column({ name: 'rollout_percent', type: 'int', default: 0 })
  rolloutPercent: number;

  @Column({
    type: process.env.DATABASE_TYPE === 'postgres' ? 'jsonb' : 'simple-json',
    nullable: true,
  })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('family_feature_flags')
@Index(['familyId', 'flagKey'], { unique: true })
export class FamilyFeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'family_id' })
  familyId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: User;

  @Column({ name: 'flag_key' })
  flagKey: string;

  @ManyToOne(() => FeatureFlag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flag_key', referencedColumnName: 'key' })
  flag: FeatureFlag;

  @Column({ default: true })
  enabled: boolean;

  @Column({
    name: 'expires_at',
    type: process.env.DATABASE_TYPE === 'postgres' ? 'timestamp' : 'datetime',
    nullable: true,
  })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
