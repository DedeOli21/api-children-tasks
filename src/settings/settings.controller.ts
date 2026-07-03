import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';

// Configurações da penalidade da meia-noite — só o responsável mexe
@Controller('settings')
@Roles(UserRole.PARENT)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.settingsService.getOrCreate(user.id);
  }

  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(user.id, dto);
  }
}
