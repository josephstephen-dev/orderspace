import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiTooManyRequestsResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiAuth, CurrentUser, Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    RefreshTokenDto,
    RegisterDto,
    ResendOtpDto,
    ResetPasswordDto,
    UpdateProfileDto,
    VerifyEmailDto,
} from './dto';
import {
    AuthResponseEntity,
    MessageResponseEntity,
    RegisterResponseEntity,
    UserEntity,
} from './entities';

// Authentication routes get tighter limits than the global default.
const CREDENTIAL_LIMIT = { default: { ttl: 60_000, limit: 5 } };
const EMAIL_LIMIT = { default: { ttl: 60_000, limit: 3 } };
const REFRESH_LIMIT = { default: { ttl: 60_000, limit: 10 } };

@ApiTags('Authentication')
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @Public()
    @Throttle(CREDENTIAL_LIMIT)
    @ApiOperation({
        summary: 'Create an account',
        description:
            'Creates the account and emails a 6-digit verification code. The email must be verified before the first login.',
    })
    @ApiCreatedResponse({ type: RegisterResponseEntity })
    @ApiBadRequestResponse({ description: 'Validation failed' })
    @ApiConflictResponse({ description: 'Email already registered' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('verify-email')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(CREDENTIAL_LIMIT)
    @ApiOperation({
        summary: 'Verify an email address',
        description: 'Confirms the account with the code from the email.',
    })
    @ApiOkResponse({ type: MessageResponseEntity })
    @ApiBadRequestResponse({ description: 'Invalid or expired code' })
    verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto);
    }

    @Post('resend-verification')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(EMAIL_LIMIT)
    @ApiOperation({
        summary: 'Send a new verification code',
        description:
            'Replaces any earlier code. The response is identical whether or not the email exists.',
    })
    @ApiOkResponse({ type: MessageResponseEntity })
    resendVerification(@Body() dto: ResendOtpDto) {
        return this.authService.resendVerificationOtp(dto);
    }

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(CREDENTIAL_LIMIT)
    @ApiOperation({
        summary: 'Log in',
        description:
            'Exchanges email and password for an access and refresh token.',
    })
    @ApiOkResponse({ type: AuthResponseEntity })
    @ApiBadRequestResponse({ description: 'Validation failed' })
    @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
    @ApiForbiddenResponse({
        description: 'Account deactivated or email not verified',
    })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(REFRESH_LIMIT)
    @ApiOperation({
        summary: 'Rotate the refresh token',
        description:
            'Each refresh token works once. Replaying a used token revokes every session of that user.',
    })
    @ApiOkResponse({ type: AuthResponseEntity })
    @ApiUnauthorizedResponse({
        description: 'Invalid, revoked or expired refresh token',
    })
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto);
    }

    @Post('forgot-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(EMAIL_LIMIT)
    @ApiOperation({
        summary: 'Request a password reset code',
        description:
            'The response is identical whether or not the email exists.',
    })
    @ApiOkResponse({ type: MessageResponseEntity })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle(CREDENTIAL_LIMIT)
    @ApiOperation({
        summary: 'Reset the password with a code',
        description: 'Revokes every active session of the account.',
    })
    @ApiOkResponse({ type: MessageResponseEntity })
    @ApiBadRequestResponse({ description: 'Invalid or expired code' })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiAuth()
    @ApiOperation({ summary: 'Log out and revoke the refresh token' })
    @ApiNoContentResponse({ description: 'Logged out' })
    async logout(
        @CurrentUser('sub') userId: string,
        @Body() dto: RefreshTokenDto,
    ) {
        await this.authService.logout(userId, dto);
    }

    @Get('me')
    @ApiAuth()
    @ApiOperation({ summary: 'Read your profile' })
    @ApiOkResponse({ type: UserEntity })
    getMe(@CurrentUser('sub') userId: string) {
        return this.authService.getMe(userId);
    }

    @Patch('me')
    @ApiAuth()
    @ApiOperation({ summary: 'Update your profile' })
    @ApiOkResponse({ type: UserEntity })
    @ApiBadRequestResponse({ description: 'Validation failed' })
    updateProfile(
        @CurrentUser('sub') userId: string,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.authService.updateProfile(userId, dto);
    }

    @Patch('me/password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiAuth()
    @ApiOperation({
        summary: 'Change your password',
        description: 'Revokes every active session, including this one.',
    })
    @ApiNoContentResponse({ description: 'Password changed' })
    @ApiBadRequestResponse({
        description: 'Validation failed or current password wrong',
    })
    async changePassword(
        @CurrentUser('sub') userId: string,
        @Body() dto: ChangePasswordDto,
    ) {
        await this.authService.changePassword(userId, dto);
    }
}
