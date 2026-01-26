'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, Pencil, Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDialog } from '@/components/dialogs/UserDialog';
import { DeleteUserDialog } from '@/components/dialogs/DeleteUserDialog';
import { TableFilters, FilterOption } from '@/components/shared/TableFilters';
import { TablePagination } from '@/components/shared/TablePagination';
import { useToast } from '@/hooks/use-toast';
import { useTableState } from '@/hooks/use-table-state';
import { trpc } from '@/lib/trpc/client';
import { formatDate } from '@/lib/utils/formatting';

const roleVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    admin: 'destructive',
    staff: 'secondary',
    owner: 'default',
    renter: 'outline',
    broker: 'default',
    tenant: 'outline',
    landlord: 'secondary',
};

function UsersSkeleton() {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t.pages.users.tableHeaders.name}</TableHead>
                    <TableHead>{t.pages.users.tableHeaders.email}</TableHead>
                    <TableHead>{t.pages.users.tableHeaders.role}</TableHead>
                    <TableHead>{t.pages.users.tableHeaders.createdAt}</TableHead>
                    <TableHead><span className="sr-only">{t.pages.users.tableHeaders.actions}</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function UsersPage() {
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { toast } = useToast();
    const utils = trpc.useUtils();

    // Table state management
    const tableState = useTableState({
        initialState: { limit: 10 },
    });

    // Role filter options
    const roleOptions: FilterOption[] = [
        { value: 'STAFF', label: 'Staff' },
        { value: 'BROKER', label: 'Broker' },
        { value: 'ADMIN', label: 'Admin' },
    ];

    // tRPC query
    const { data, isLoading, error } = trpc.staff.list.useQuery({
        page: tableState.state.page,
        limit: tableState.state.limit,
        search: tableState.state.search || undefined,
        role: (tableState.state.filters.role && tableState.state.filters.role !== 'all')
            ? tableState.state.filters.role as 'ADMIN' | 'STAFF' | 'BROKER'
            : undefined,
    });

    const users = data?.users || [];
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

    const handleCreateUser = () => {
        setSelectedUser(null);
        setUserDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setUserDialogOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const handleSuccess = () => {
        utils.staff.list.invalidate();
        toast({
            title: 'Success',
            description: 'User operation completed successfully.',
        });
    };

    return (
        <div>
            <PageTitle title={t.pages.users.title} subtitle={t.pages.users.subtitle} />

            <TableFilters
                searchPlaceholder="Search by name or email..."
                searchValue={tableState.state.search}
                onSearchChange={tableState.setSearch}
                selectFilters={[
                    {
                        key: 'role',
                        label: 'Roles',
                        placeholder: 'Filter by role',
                        options: roleOptions,
                        value: tableState.state.filters.role || 'all',
                        onChange: (value) => tableState.setFilter('role', value),
                    },
                ]}
                onClear={tableState.clearFilters}
            />

            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t.pages.users.cardTitle}</CardTitle>
                        <CardDescription>
                            {!isLoading && !error && (
                                `Showing ${users.length} of ${pagination.total} users`
                            )}
                        </CardDescription>
                    </div>
                     <Button onClick={handleCreateUser}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t.pages.users.newUser}
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <UsersSkeleton />
                    ) : error ? (
                        <div className="text-center py-10 text-destructive">
                            <p>{t.pages.users.errorLoading}</p>
                            <p className="text-sm">{error.message}</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>{t.pages.users.noUsersFound}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.pages.users.tableHeaders.name}</TableHead>
                                    <TableHead>{t.pages.users.tableHeaders.email}</TableHead>
                                    <TableHead>{t.pages.users.tableHeaders.role}</TableHead>
                                    <TableHead>{t.pages.users.tableHeaders.createdAt}</TableHead>
                                    <TableHead><span className="sr-only">{t.pages.users.tableHeaders.actions}</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={roleVariantMap[user.role.toLowerCase()] || 'default'} className="capitalize">
                                                {user.role.toLowerCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditUser(user as User)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        {t.pages.users.actions.edit}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleDeleteUser(user as User)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {t.pages.users.actions.delete}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {!isLoading && !error && users.length > 0 && (
                        <TablePagination
                            pagination={pagination}
                            onPageChange={tableState.setPage}
                            onLimitChange={tableState.setLimit}
                            isLoading={isLoading}
                        />
                    )}
                </CardContent>
            </Card>

            <UserDialog
                open={userDialogOpen}
                onOpenChange={setUserDialogOpen}
                user={selectedUser}
                onSuccess={handleSuccess}
            />

            <DeleteUserDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                user={selectedUser}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
