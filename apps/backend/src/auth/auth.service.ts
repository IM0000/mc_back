// /auth/auth.service.ts

import * as jwt from 'jsonwebtoken';
import { Injectable, Inject } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../users/dto/login.dto';
import { OAuthStrategy } from './oauth/oauth-strategy.interface';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService, // Users 관련 로직
    @Inject('OAUTH_STRATEGIES') private readonly strategies: OAuthStrategy[], // OAuth 전략들
  ) {}

  /**
   * 이메일과 비밀번호로 로그인 처리
   * @param loginDto 로그인 정보
   * @returns JWT 토큰과 사용자 정보
   */
  async loginWithEmail(loginDto: LoginDto): Promise<any> {
    const user = await this.usersService.validateUserByEmailAndPassword(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new Error('잘못된 이메일 또는 비밀번호입니다.');
    }
    const token = this.generateJwtToken(user);
    return { token, user };
  }

  /**
   * OAuth 제공자를 통해 로그인 처리
   * @param provider OAuth 제공자 이름
   * @param query OAuth 제공자로부터 받은 쿼리 파라미터
   * @returns JWT 토큰과 사용자 정보
   */
  async loginWithOAuth(provider: string, query: any): Promise<any> {
    const strategy = this.strategies.find(
      (strategy) => strategy.provider === provider,
    );
    if (!strategy) {
      throw new Error(`'${provider}'는 지원하지 않는 인증 기관입니다.`);
    }
    const oauthUser = await strategy.authenticate(query);
    const user = await this.usersService.findOrCreateUserFromOAuth(oauthUser);
    const token = this.generateJwtToken(user);
    return { token, user };
  }

  /**
   * JWT 토큰 생성
   * @param user 사용자 정보
   * @returns JWT 토큰
   */
  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id, // 토큰의 subject (주체)로 사용자 ID 설정
      email: user.email,
      nickname: user.nickname,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '3600s'); // 기본값 '3600s'

    // JWT 생성
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * JWT 토큰 검증 함수 (JwtStrategy에서 처리)
   * @param token JWT 토큰
   * @returns 디코딩된 토큰 정보
   */
  async verifyJwtToken(token: string): Promise<any> {
    const secret = this.configService.get<string>('JWT_SECRET');
    try {
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      throw new Error('유효하지 않은 토큰입니다.');
    }
  }
}