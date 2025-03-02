import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { AuthService } from '../auth.service';
import { discordConfig } from '../../config/discord.config';
import { ConfigType } from '@nestjs/config';
import { OAuthProviderEnum } from '../enum/oauth-provider.enum';

@Injectable()
export class DiscordStrategy extends PassportStrategy(
  Strategy,
  OAuthProviderEnum.Discord,
) {
  constructor(
    @Inject(discordConfig.KEY)
    private readonly discordConfiguration: ConfigType<typeof discordConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: discordConfiguration.clientID,
      clientSecret: discordConfiguration.clientSecret,
      callbackURL: discordConfiguration.callbackURL,
      scope: ['identify', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<any> {
    const { username, email } = profile;
    const user = {
      username,
      email,
      accessToken,
    };
    done(null, user);
  }
}
