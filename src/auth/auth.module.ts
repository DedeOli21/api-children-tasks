import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccessControlService } from './access-control.service';
import { getJwtSecret } from '../config/jwt.config';
import { User, TeacherStudent } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeacherStudent]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AccessControlService],
  exports: [AuthService, JwtStrategy, PassportModule, AccessControlService],
})
export class AuthModule {}
