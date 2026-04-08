import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';

interface ILoginDto {
  email?: string;
  password?: string;
}

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  login(@Body() body: ILoginDto): { token: string; email: string } {
    const email = (body?.email ?? '').trim();
    const password = (body?.password ?? '').trim();
    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    return {
      token: `fake-token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email,
    };
  }
}
