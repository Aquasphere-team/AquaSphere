import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AquariumComponent } from './aquarium.component';
import { SupabaseService } from '../../services/supabase.service';

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

describe('AquariumComponent', () => {
  let component: AquariumComponent;
  let fixture: ComponentFixture<AquariumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AquariumComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AquariumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
