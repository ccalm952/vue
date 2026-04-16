import { Controller, Post, Get, Body, Headers } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: { username?: string; password?: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Get("info")
  getUserInfo(@Headers("authorization") auth?: string) {
    return this.authService.getUserInfo(auth);
  }

  @Post("logout")
  logout() {
    return this.authService.logout();
  }

  @Get("doctors")
  getDoctors() {
    return this.authService.getDoctorList();
  }
}
