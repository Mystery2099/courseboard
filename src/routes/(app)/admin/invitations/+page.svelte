<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
</script>

<h1 class="text-2xl font-semibold">Invitations</h1>
<p class="mt-2 text-sm opacity-70">
	Each link works once, for the invited email address only, and expires after 7 days. Copy the link
	now; it can't be shown again.
</p>

<form method="POST" action="?/create" use:enhance class="mt-6 flex flex-wrap items-end gap-2">
	<label class="flex flex-col text-sm">
		Email address
		<input
			name="email"
			type="email"
			required
			autocomplete="off"
			class="mt-1 rounded border px-2 py-1"
		/>
	</label>
	<button type="submit" class="rounded border px-4 py-1">Create invitation</button>
</form>
{#if form?.createError}<p class="mt-2 text-sm" role="alert">{form.createError}</p>{/if}
{#if form?.createdInvitation}
	<div class="mt-4 rounded border p-4 text-sm">
		<p>
			Invitation for {form.createdInvitation.email}, valid until {dateFormatter.format(
				form.createdInvitation.expiresAt
			)}:
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
			>Copy link</button
		>
	</div>
{/if}
{#if form?.revokeError}<p class="mt-4 text-sm" role="alert">{form.revokeError}</p>{/if}

<table class="mt-8 w-full text-left text-sm">
	<thead>
		<tr><th class="py-2">Email</th><th>Status</th><th>Created</th><th>Expires</th><th></th></tr>
	</thead>
	<tbody>
		{#each data.invitations as invitation (invitation.id)}
			<tr class="border-t">
				<td class="py-2">{invitation.email}</td>
				<td>{invitation.status}</td>
				<td>{dateFormatter.format(invitation.createdAt)}</td>
				<td>{dateFormatter.format(invitation.expiresAt)}</td>
				<td>
					{#if invitation.status === 'pending'}
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="invitationId" value={invitation.id} />
							<button type="submit" class="underline">Revoke</button>
						</form>
					{/if}
				</td>
			</tr>
		{:else}
			<tr><td colspan="5" class="py-2 opacity-70">No invitations yet.</td></tr>
		{/each}
	</tbody>
</table>
