import { Prisma } from '@prisma/client';
import { ConflictError, SystemError } from '../errors/app.error';

export function handlePrismaError(error: unknown, resourceName: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : 'field';
      throw new ConflictError(`${resourceName} already exists with this ${field}`);
    }
  }

  throw new SystemError(`Failed to process ${resourceName}`, error);
}
