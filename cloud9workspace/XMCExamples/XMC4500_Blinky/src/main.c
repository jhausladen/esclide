/*! 
 * \brief Simple XMC Relax Kit demo program.
 * \author M. Horauer
 * \version 0.1
 */
#include "XMC4500.h"

#define STACK_TOP 0x2000FFFF

//! Function Prototypes
int main(void);
void wait(unsigned long);

//! Vector table

unsigned int *myvectors[2]
__attribute__ ((section("vectors"))) = {
    (unsigned int *) STACK_TOP,
    (unsigned int *) main,
};

//! \brief Main routine that toggles are port with 
int main(void) 
{
  unsigned int i = 100000;
  unsigned int j;
  PORT1->IOCR0 |= 0x8000; // P1.1 output, push pull   

  j = 0;
  while(1) {
    PORT1->OUT = 0x2; // write 1 to P1.1 -> Port1.1 is low
    wait(i);
    PORT1->OUT = 0x0; // write 0 to P1.1 -> Port 1.1 is high
    wait(i);
    i = i + 5000;
    
    if(j==1)
	   break;
  }
  return 0;
}

void wait(unsigned long delay) {
  while(delay--) {
    __NOP();
  }
}
/*! EOF */