import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from '../auth/access-control.service';
import { User, UserRole } from '../entities';

// Relatórios compilados: responsável e terapeuta (professor vê só o recorte
// acadêmico dele; a criança não acessa notas de adultos)
@Controller('reports')
@Roles(UserRole.PARENT, UserRole.THERAPIST)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly accessControl: AccessControlService,
  ) {}

  private safeDays(days?: string): number {
    const parsed = days ? parseInt(days, 10) : NaN;
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 7), 90) : 30;
  }

  // JSON para o PDF gerado no cliente
  @Get('compile')
  async compile(
    @CurrentUser() user: User,
    @Query('childId') childId: string,
    @Query('days') days?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    return this.reportsService.compile(child, this.safeDays(days));
  }

  // Download direto em CSV
  @Get('export.csv')
  async exportCsv(
    @CurrentUser() user: User,
    @Query('childId') childId: string,
    @Res() res: Response,
    @Query('days') days?: string,
  ) {
    const child = await this.accessControl.resolveChild(user, childId);
    const csv = await this.reportsService.exportCsv(child, this.safeDays(days));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-${child.name.toLowerCase().replace(/\s+/g, '-')}.csv"`,
    );
    res.send(csv);
  }
}
