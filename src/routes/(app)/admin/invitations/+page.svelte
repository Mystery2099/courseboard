<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { describeErrorCode } from '#lib/client/ErrorPresentation.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { InvitationStatus } from '#lib/contracts/InvitationContract.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const dateFormatter = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' });

	const INVITATION_STATUS_LABELS: Record<InvitationStatus, () => string> = {
		pending: m.invitation_status_pending,
		expired: m.invitation_status_expired,
		revoked: m.invitation_status_revoked,
		redeemed: m.invitation_status_redeemed
	};
</script>

<h1 class="text-2xl font-semibold">{m.admin_section_invitations()}</h1>
<p class="mt-2 text-sm opacity-70">
	{m.admin_invitations_explanation()}
</p>

<form method="POST" action="?/create" use:enhance class="mt-6 flex flex-wrap items-end gap-2">
	<label class="flex flex-col text-sm">
		{m.admin_invitations_email_address()}
		<input
			name="email"
			type="email"
			required
			autocomplete="off"
			class="mt-1 rounded border px-2 py-1"
		/>
	</label>
	<button type="submit" class="rounded border px-4 py-1">{m.admin_invitations_create()}</button>
</form>
{#if form?.createError}<p class="mt-2 text-sm" role="alert">{describeErrorCode(form.createError)}</p>{/if}
{#if form?.createdInvitation}
	<div class="mt-4 rounded border p-4 text-sm">
		<p>
			{m.admin_invitations_created({
				email: form.createdInvitation.email,
				expiresAt: dateFormatter.format(new Date(form.createdInvitation.expiresAt))
			})}
		</p>
		<input
			readonly
			value={form.createdInvitation.link}
			class="mt-2 w-full rounded border px-2 py-1 font-mono text-xs"
			onfocus={(event) => event.currentTarget.select()}
		/>
		<button
			type="button"
			class="mt-2 rounded border px-3 py-1"
			onclick={() => navigator.clipboard.writeText(form?.createdInvitation?.link ?? '')}
			>{m.admin_invitations_copy_link()}</button
		>
	</div>
{/if}
{#if form?.revokeError}<p class="mt-4 text-sm" role="alert">{describeErrorCode(form.revokeError)}</p>{/if}

<h2 class="mt-8 text-lg font-semibold">{m.admin_invitations_pending()}</h2>
<p class="text-sm opacity-70">{m.admin_invitations_pending_explanation()}</p>
{#if data.hasMorePendingInvitations}
	<p class="mt-2 text-sm" role="alert">
		{m.admin_invitations_pending_truncated({ count: data.pendingInvitations.length })}
	</p>
{/if}
<table class="mt-2 w-full text-left text-sm">
	<thead>
		<tr>
			<th class="py-2">{m.admin_invitations_email()}</th>
			<th>{m.admin_invitations_created_at()}</th>
			<th>{m.admin_invitations_expires_at()}</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.pendingInvitations as invitation (invitation.id)}
			<tr class="border-t">
				<td class="py-2">{invitation.email}</td>
				<td>{dateFormatter.format(new Date(invitation.createdAt))}</td>
				<td>{dateFormatter.format(new Date(invitation.expiresAt))}</td>
				<td>
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="invitationId" value={invitation.id} />
						<button type="submit" class="underline">{m.admin_invitations_revoke()}</button>
					</form>
				</td>
			</tr>
		{:else}
			<tr><td colspan="4" class="py-2 opacity-70">{m.admin_invitations_pending_empty()}</td></tr>
		{/each}
	</tbody>
</table>

<h2 class="mt-8 text-lg font-semibold">{m.admin_invitations_recent()}</h2>
<p class="text-sm opacity-70">{m.admin_invitations_recent_explanation()}</p>
<table class="mt-2 w-full text-left text-sm">
	<thead>
		<tr>
			<th class="py-2">{m.admin_invitations_email()}</th>
			<th>{m.admin_invitations_status()}</th>
			<th>{m.admin_invitations_created_at()}</th>
			<th>{m.admin_invitations_expires_at()}</th>
		</tr>
	</thead>
	<tbody>
		{#each data.closedInvitations as invitation (invitation.id)}
			<tr class="border-t">
				<td class="py-2">{invitation.email}</td>
				<td>{INVITATION_STATUS_LABELS[invitation.status]()}</td>
				<td>{dateFormatter.format(new Date(invitation.createdAt))}</td>
				<td>{dateFormatter.format(new Date(invitation.expiresAt))}</td>
			</tr>
		{:else}
			<tr><td colspan="4" class="py-2 opacity-70">{m.admin_invitations_recent_empty()}</td></tr>
		{/each}
	</tbody>
</table>
