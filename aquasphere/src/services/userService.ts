import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { User } from '../models/user.model';

// NOTE: This service is deprecated - we now use SupabaseService for authentication
// Kept for reference only, not actively used
@Injectable({
  providedIn: 'root' })
export class UserService {
  // private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  register(data: {username: string, password: string}){
    throw new Error('UserService is deprecated. Use SupabaseService instead.');
    // return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: {username: string, password: string}) {
    throw new Error('UserService is deprecated. Use SupabaseService instead.');
    // return this.http.post<User>(`${this.apiUrl}/login`, data).subscribe(
    //   (response: any) => {
    //     console.log('Login successful:', response);
    //     localStorage.setItem('accesToken', response.accesToken);
    //     localStorage.setItem('refreshToken', response.refreshToken);
    //   }
    // );
  }

  logout(): void {
    localStorage.removeItem('accesToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accesToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

}
