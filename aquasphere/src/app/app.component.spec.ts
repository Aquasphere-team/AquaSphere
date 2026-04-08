import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { SupabaseService } from '../services/supabase.service';

const supabaseServiceMock = jasmine.createSpyObj('SupabaseService', [
  'getCurrentUser',
  'signUp',
  'signIn',
  'signOut',
  'getEmailByUsername',
  'saveAquariumState',
  'loadAquariumState',
  'getClient'
]);

supabaseServiceMock.getCurrentUser.and.resolveTo(null);
supabaseServiceMock.signUp.and.resolveTo({ user: null, session: null });
supabaseServiceMock.signIn.and.resolveTo({ user: null, session: null });
supabaseServiceMock.signOut.and.resolveTo(undefined);
supabaseServiceMock.getEmailByUsername.and.resolveTo(null);
supabaseServiceMock.saveAquariumState.and.resolveTo(null);
supabaseServiceMock.loadAquariumState.and.resolveTo(null);
supabaseServiceMock.getClient.and.returnValue({});

describe('AppComponent', () => {
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'AquaSphere' title`, () => {
    const app = fixture.componentInstance;
    expect(app.title).toEqual('AquaSphere');
  });

  it('should render title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('AquaSphere');
  });
});
