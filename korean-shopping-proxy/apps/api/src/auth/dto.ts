import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/** POST /auth/login body. Bounds guard against absurd inputs; credentials are verified in the service. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}

/** POST /auth/password body — initial-credential rotation / password change (FR-038). */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  newPassword!: string;
}
