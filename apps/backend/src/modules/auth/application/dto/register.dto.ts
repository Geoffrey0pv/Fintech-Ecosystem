import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(254)
  email!: string;

  // Min 10 chars, at least one lowercase, one uppercase and one digit (SPEC 3.2).
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain upper case, lower case and a digit',
  })
  password!: string;
}
