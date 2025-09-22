import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, EllipsisVertical, Search, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  onBulkDelete?: (rows: TData[]) => void;
  onBulkExportCsv?: (rows: TData[]) => void;
  getRowId?: (row: TData) => string;
  onRowFavoriteToggle?: (row: TData) => void;
  isRowFavorited?: (row: TData) => boolean;
  onRowEdit?: (row: TData) => void;
  onRowCopy?: (row: TData) => void;
  onRowDelete?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  onBulkDelete,
  onBulkExportCsv,
  getRowId,
  onRowFavoriteToggle,
  isRowFavorited,
  onRowEdit,
  onRowCopy,
  onRowDelete,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId as any,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
  });

  const hasSearchColumn = !!searchKey && table.getAllLeafColumns().some(c => c.id === searchKey);
  const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original as TData);
  const numSelected = selectedRows.length;

  // Build compact-like classes inspired by shadcn dashboard example
  const tableWrapperClass = "rounded-lg border overflow-hidden";
  const headerClass = "table-header sticky top-0 z-10";
  const bodyClass = "[&_*]:align-middle";
  const rowClass = "table-row h-9"; // compact row height
  const cellClass = "py-1.5 px-3"; // tighter paddings

  return (
    <div className="w-full data-grid data-grid-compact space-y-3 p-3">
      {/* Top toolbar */}
      <div className="flex items-center justify-between">
        {hasSearchColumn && searchKey && (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search...`}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-8"
            />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Bulk selection bar */}
      {numSelected > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <Badge variant="secondary">{numSelected}</Badge>
          <span className="text-xs text-muted-foreground">selected</span>
          <div className="ml-auto flex items-center gap-2">
            {onBulkDelete && (
              <Button variant="destructive" size="sm" onClick={() => onBulkDelete(selectedRows)}>
                Delete
              </Button>
            )}
            {onBulkExportCsv && (
              <Button variant="outline" size="sm" onClick={() => onBulkExportCsv(selectedRows)}>
                Download CSV
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={tableWrapperClass}>
        <div className="max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader className={headerClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-9">
                  <TableHead className={cn(cellClass, "w-8")}> 
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                      />
                    </div>
                  </TableHead>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={cellClass} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                  <TableHead className={cn(cellClass, "w-10 text-right")}></TableHead>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className={bodyClass}>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={rowClass}
                  >
                    <TableCell className={cn(cellClass, "w-8")}> 
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={row.getIsSelected()}
                          onCheckedChange={(value) => row.toggleSelected(!!value)}
                          aria-label="Select row"
                        />
                      </div>
                    </TableCell>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cellClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                    <TableCell className={cn(cellClass, "w-10 text-right")}> 
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <EllipsisVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {onRowEdit && (
                            <DropdownMenuItem onClick={() => onRowEdit(row.original as TData)}>Edit</DropdownMenuItem>
                          )}
                          {onRowCopy && (
                            <DropdownMenuItem onClick={() => onRowCopy(row.original as TData)}>Make a copy</DropdownMenuItem>
                          )}
                          {onRowFavoriteToggle && (
                            <DropdownMenuItem onClick={() => onRowFavoriteToggle(row.original as TData)}>
                              <Star className={cn("mr-2 h-4 w-4", isRowFavorited && isRowFavorited(row.original as TData) ? "fill-yellow-500 text-yellow-500" : "")}/>
                              {isRowFavorited && isRowFavorited(row.original as TData) ? "Unfavorite" : "Favorite"}
                            </DropdownMenuItem>
                          )}
                          {onRowDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => onRowDelete(row.original as TData)}>
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 2}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 text-xs text-muted-foreground">
          {numSelected} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}