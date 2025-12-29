import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PistaDigitalEquiposComponent } from '../../pista-digital-equipos/pista-digital-equipos.component';

describe('PistaDigitalEquiposComponent', () => {
  let component: PistaDigitalEquiposComponent;
  let fixture: ComponentFixture<PistaDigitalEquiposComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PistaDigitalEquiposComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PistaDigitalEquiposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
