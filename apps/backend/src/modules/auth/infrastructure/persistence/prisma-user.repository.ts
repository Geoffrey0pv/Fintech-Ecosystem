import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UserRecord, UserRepositoryPort } from '../../application/ports/user.repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, passwordHash: true },
    });
    return user;
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, passwordHash: true },
    });
  }
}
