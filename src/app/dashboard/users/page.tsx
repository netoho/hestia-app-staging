'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import type { User, UserRole } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

const roleVariantMap: Record<UserRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin: 'destructive',
  staff: 'secondary',
  owner: 'default',
  renter: 'outline',
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
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUsers() {
            try {
                const response = await fetch('/api/users');
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                const data = await response.json();
                setUsers(data);
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        }
        fetchUsers();
    }, []);

    return (
        <div>
            <PageTitle title={t.pages.users.title} subtitle={t.pages.users.subtitle} />
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t.pages.users.cardTitle}</CardTitle>
                        <CardDescription>{!isLoading && !error && t.pages.users.cardDescription(users.length)}</CardDescription>
                    </div>
                     <Button>
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
                            <p className="text-sm">{error}</p>
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
                                            <Badge variant={roleVariantMap[user.role]} className="capitalize">
                                                {t.pages.users.roleLabels[user.role]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(user.createdAt!).toLocaleDateString('es-MX')}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>{t.pages.users.actions.edit}</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">{t.pages.users.actions.delete}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
