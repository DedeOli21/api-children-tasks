import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PetService } from './pet.service';
import { RenamePetDto } from './dto/rename-pet.dto';
import { CarePetDto } from './dto/care-pet.dto';
import { ChoosePetSpeciesDto } from './dto/choose-pet-species.dto';
import { CreateShopItemDto, UpdateShopItemDto } from './dto/create-shop-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

@Controller('pet')
export class PetController {
  constructor(
    private readonly petService: PetService,
    private readonly accessControl: AccessControlService,
  ) {}

  // ============ O PET (criança cuida; responsável/terapeuta observam) ============

  @Get()
  @Roles(UserRole.CHILD, UserRole.PARENT, UserRole.THERAPIST)
  async getPet(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.petService.getPet(child);
  }

  @Patch('name')
  @Roles(UserRole.CHILD)
  rename(@CurrentUser() user: User, @Body() dto: RenamePetDto) {
    return this.petService.rename(user, dto.name);
  }

  @Patch('species')
  @Roles(UserRole.CHILD)
  chooseSpecies(@CurrentUser() user: User, @Body() dto: ChoosePetSpeciesDto) {
    return this.petService.chooseSpecies(user, dto.species);
  }

  // Hidratar/alimentar consumindo item do inventário
  @Post('care')
  @Roles(UserRole.CHILD)
  care(@CurrentUser() user: User, @Body() dto: CarePetDto) {
    return this.petService.care(user, dto.shopItemId);
  }

  // ============ LOJA DO PET ============

  @Get('shop')
  @Roles(UserRole.CHILD, UserRole.PARENT)
  catalog(@CurrentUser() user: User) {
    return this.petService.catalog(this.accessControl.familyIdOf(user));
  }

  // A criança compra com as próprias estrelas
  @Post('shop/:itemId/buy')
  @Roles(UserRole.CHILD)
  buy(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.petService.buy(user, this.accessControl.familyIdOf(user), itemId);
  }

  @Get('inventory')
  @Roles(UserRole.CHILD, UserRole.PARENT)
  async inventory(@CurrentUser() user: User, @Query('childId') childId?: string) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.petService.inventory(child.id);
  }

  @Patch('inventory/:itemId/equip')
  @Roles(UserRole.CHILD)
  equip(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.petService.equip(user, itemId);
  }

  // ============ LOJA DO PET (responsável) ============

  @Post('shop-items')
  @Roles(UserRole.PARENT)
  createShopItem(@CurrentUser() user: User, @Body() dto: CreateShopItemDto) {
    return this.petService.createShopItem(user.id, dto);
  }

  @Patch('shop-items/:id')
  @Roles(UserRole.PARENT)
  updateShopItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateShopItemDto,
  ) {
    return this.petService.updateShopItem(user.id, id, dto);
  }

  @Delete('shop-items/:id')
  @Roles(UserRole.PARENT)
  removeShopItem(@CurrentUser() user: User, @Param('id') id: string) {
    return this.petService.removeShopItem(user.id, id);
  }
}
