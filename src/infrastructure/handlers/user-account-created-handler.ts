// src/infrastructure/handlers/user-account-created-handler.ts
import { CreatedUserAccountEvent, DomainEventType } from "../../domain/events";
import {
  DomainEventHandler,
  EventHandler,
} from "../../domain/interfaces/domain-event-handler";

@EventHandler(DomainEventType.USER_ACCOUNT_CREATED, "user-welcome-email-queue")
export class UserAccountCreatedHandler
  implements DomainEventHandler<CreatedUserAccountEvent>
{
  async handle(event: CreatedUserAccountEvent): Promise<void> {
    console.log(
      `Sending welcome email to: ${event.payload.email} for user: ${event.payload.name}`
    );
    await this.sendWelcomeEmail(event.payload.email, event.payload.name);
  }
  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Welcome email sent to ${email}`);
  }
}
